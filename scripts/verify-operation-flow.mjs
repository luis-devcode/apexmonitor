import { copyFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";

// A verificação roda numa cópia descartável: nunca altera o dev.db real.
const tempDb = join(tmpdir(), `central-odds-operation-${Date.now()}.db`);
await copyFile(resolve("dev.db"), tempDb);
const db = new Database(tempDb);
db.pragma("foreign_keys = ON");

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const id = () => randomUUID();
const now = () => new Date().toISOString();

try {
  const userId = db.prepare("SELECT id FROM User LIMIT 1").get()?.id;
  assert(userId, "é necessário ao menos um usuário para verificar o fluxo");

  const betanoId = id();
  const bet365Id = id();
  const betanoAccountId = id();
  const bet365AccountId = id();
  const operationId = id();
  const losingLegId = id();
  const winningLegId = id();

  db.prepare("INSERT INTO Casa (id,nome,comissaoPct,ativo,createdAt,userId) VALUES (?,?,0,1,?,?)")
    .run(betanoId, `TEST_BETANO_${id()}`, now(), userId);
  db.prepare("INSERT INTO Casa (id,nome,comissaoPct,ativo,createdAt,userId) VALUES (?,?,0,1,?,?)")
    .run(bet365Id, `TEST_BET365_${id()}`, now(), userId);
  db.prepare("INSERT INTO Conta (id,casaId,saldo,status,createdAt,updatedAt,userId) VALUES (?,?,1000,'disponivel',?,?,?)")
    .run(betanoAccountId, betanoId, now(), now(), userId);
  db.prepare("INSERT INTO Conta (id,casaId,saldo,status,createdAt,updatedAt,userId) VALUES (?,?,1000,'disponivel',?,?,?)")
    .run(bet365AccountId, bet365Id, now(), now(), userId);
  db.prepare("INSERT INTO Movimento (id,contaId,tipo,valor,descricao,data,createdAt,userId) VALUES (?,?,'DEPOSITO',1000,'Saldo inicial',?,?,?)")
    .run(id(), betanoAccountId, now(), now(), userId);
  db.prepare("INSERT INTO Movimento (id,contaId,tipo,valor,descricao,data,createdAt,userId) VALUES (?,?,'DEPOSITO',1000,'Saldo inicial',?,?,?)")
    .run(id(), bet365AccountId, now(), now(), userId);

  // Criar operação não movimenta a banca: o risco aparece como exposição.
  db.transaction(() => {
    db.prepare("INSERT INTO Operacao (id,tipo,procedimento,evento,data,stakeTotal,lucroEsperado,status,createdAt,updatedAt,userId) VALUES (?,?,?, ?,?,200,50,'PENDENTE',?,?,?)")
      .run(operationId, "SUREBET", "SUREBET", "Teste financeiro", now(), now(), now(), userId);
    db.prepare("INSERT INTO PernaOperacao (id,operacaoId,contaId,selecao,odd,stake,risco,resultado,createdAt,updatedAt,userId) VALUES (?,?,?,?,2.5,100,100,'PENDENTE',?,?,?)")
      .run(losingLegId, operationId, betanoAccountId, "Casa", now(), now(), userId);
    db.prepare("INSERT INTO PernaOperacao (id,operacaoId,contaId,selecao,odd,stake,risco,resultado,createdAt,updatedAt,userId) VALUES (?,?,?,?,2.5,100,100,'PENDENTE',?,?,?)")
      .run(winningLegId, operationId, bet365AccountId, "Fora", now(), now(), userId);
  })();

  assert(db.prepare("SELECT saldo FROM Conta WHERE id=?").get(betanoAccountId).saldo === 1000, "a criação debitou saldo antes da liquidação");
  assert(db.prepare("SELECT saldo FROM Conta WHERE id=?").get(bet365AccountId).saldo === 1000, "a criação debitou saldo antes da liquidação");

  db.transaction(() => {
    const lock = db.prepare("UPDATE Operacao SET status='LIQUIDANDO',updatedAt=? WHERE id=? AND userId=? AND status='PENDENTE'")
      .run(now(), operationId, userId);
    assert(lock.changes === 1, "operação não foi bloqueada para liquidação");

    db.prepare("UPDATE PernaOperacao SET resultado='RED',retorno=0,updatedAt=? WHERE id=?").run(now(), losingLegId);
    db.prepare("UPDATE PernaOperacao SET resultado='GREEN',retorno=250,updatedAt=? WHERE id=?").run(now(), winningLegId);
    db.prepare("INSERT INTO Movimento (id,contaId,tipo,valor,descricao,operacaoId,data,createdAt,userId) VALUES (?,?,'APOSTA',-100,'Teste financeiro',?,?,?,?)")
      .run(id(), betanoAccountId, operationId, now(), now(), userId);
    db.prepare("INSERT INTO Movimento (id,contaId,tipo,valor,descricao,operacaoId,data,createdAt,userId) VALUES (?,?,'APOSTA',-100,'Teste financeiro',?,?,?,?)")
      .run(id(), bet365AccountId, operationId, now(), now(), userId);
    db.prepare("INSERT INTO Movimento (id,contaId,tipo,valor,descricao,operacaoId,data,createdAt,userId) VALUES (?,?,'RETORNO',250,'Teste financeiro',?,?,?,?)")
      .run(id(), bet365AccountId, operationId, now(), now(), userId);
    db.prepare("UPDATE Conta SET saldo=saldo-100,updatedAt=? WHERE id=?").run(now(), betanoAccountId);
    db.prepare("UPDATE Conta SET saldo=saldo+150,updatedAt=? WHERE id=?").run(now(), bet365AccountId);
    db.prepare("UPDATE Operacao SET status='FINALIZADA',lucroReal=50,liquidadaEm=?,updatedAt=? WHERE id=?")
      .run(now(), now(), operationId);
  })();

  const finalBetano = db.prepare("SELECT saldo FROM Conta WHERE id=?").get(betanoAccountId).saldo;
  const finalBet365 = db.prepare("SELECT saldo FROM Conta WHERE id=?").get(bet365AccountId).saldo;
  const duplicateLock = db.prepare("UPDATE Operacao SET status='LIQUIDANDO' WHERE id=? AND status='PENDENTE'").run(operationId);
  const ledgerBetano = db.prepare("SELECT SUM(valor) total FROM Movimento WHERE contaId=?").get(betanoAccountId).total;
  const ledgerBet365 = db.prepare("SELECT SUM(valor) total FROM Movimento WHERE contaId=?").get(bet365AccountId).total;

  assert(finalBetano === 900, `Betano deveria terminar em 900, terminou em ${finalBetano}`);
  assert(finalBet365 === 1150, `Bet365 deveria terminar em 1150, terminou em ${finalBet365}`);
  assert(ledgerBetano === finalBetano && ledgerBet365 === finalBet365, "o extrato não fecha com o saldo das contas");
  assert(duplicateLock.changes === 0, "a trava permitiu uma segunda liquidação");
  assert(db.pragma("foreign_key_check").length === 0, "há relacionamentos inválidos no banco de teste");

  console.log(JSON.stringify({
    betano: finalBetano,
    bet365: finalBet365,
    patrimonio: finalBetano + finalBet365,
    lucro: 50,
    ledgerBalanced: true,
    duplicateSettlementBlocked: true,
  }));
} finally {
  db.close();
  await unlink(tempDb).catch(() => {});
}

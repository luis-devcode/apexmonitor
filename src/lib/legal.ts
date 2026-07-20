export type LegalInfo = {
  controllerName: string;
  controllerDocument: string;
  controllerAddress: string;
  privacyEmail: string;
  hasPendingFields: boolean;
};

export function getLegalInfo(): LegalInfo {
  const controllerName = process.env.LEGAL_ENTITY_NAME?.trim() || "ApexMonitor";
  const controllerDocument = process.env.LEGAL_ENTITY_DOCUMENT?.trim() || "PENDENTE";
  const controllerAddress = process.env.LEGAL_ENTITY_ADDRESS?.trim() || "PENDENTE";
  const privacyEmail = process.env.PRIVACY_EMAIL?.trim() || "privacidade@apexmonitor.com.br";

  return {
    controllerName,
    controllerDocument,
    controllerAddress,
    privacyEmail,
    hasPendingFields: controllerDocument === "PENDENTE" || controllerAddress === "PENDENTE",
  };
}

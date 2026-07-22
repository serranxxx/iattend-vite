export const buildBankMessage = (transferencia) =>
    `¡Hola!\n\nEstos son mis datos para transferir:\n\nBeneficiario: ${transferencia.titular}\nCLABE: ${transferencia.clabe}\nEntidad financiera: ${transferencia.banco}`

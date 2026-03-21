/**
 * EPT-OMR Project - TEST_Suite
 * This file contains manual assertions that can be executed directly within the 
 * Google Apps Script Editor if needed. 
 * 
 * NOTE: For local development, we use Jest BDD/TDD tests (see __tests__ folder).
 */

function _test_insercion_portafolio() {
    Logger.log("Iniciando Prueba de Inserción / Upsert en Portafolio...");

    // 1. Simular payload proveniente del API_Universal
    const mockPayload = {
        id_portafolio: "PORT-TEST-999",
        nombre: "Portafolio de Pruebas Automatizadas",
        descripcion: "Generado por Test Manual desde el Editor",
        estado: "Borrador",
        temas_estrategicos: "Innovación, IA",
        flujos_valor: "Operaciones AI",
        clientes_segmentos: "B2B",
        presupuesto: 1500000,
        kpis_metricas: "Adopción 50%",
        created_at: new Date().toISOString(),
        updated_by: Session.getActiveUser().getEmail()
    };

    try {
        // En lugar de llamar directamente a create, lo llamamos desde el Engine_DB para probar toda su orquestación
        // Como 'create' ahora regresó a ser síncrono en GAS natively:
        const result = Engine_DB.create("Portafolio", mockPayload);

        Logger.log("Resultado de la ejecución síncrona: " + JSON.stringify(result));
        Logger.log("✅ Prueba completada con éxito. Revisa la hoja DB_Portafolio.");
    } catch (e) {
        Logger.log("❌ Fallo en la prueba de inserción: " + e.message + " | " + e.stack);
    }
}

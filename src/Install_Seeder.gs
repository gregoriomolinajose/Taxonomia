// src/Install_Seeder.gs

/**
 * Seeder inicial para Taxonomía.
 * Instala permisos semilla para administradores y recursos base como tipografías, evitando un sistema vacío.
 * Ejecutar `runTaxonomiaInstall()` una vez tras el despliegue inicial.
 */

function runTaxonomiaInstall() {
    Logger.log("Iniciando Seed de Configuración de Taxonomía...");
    const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, useCloudDB: false };

    // 1. Inyectar Permisos Base (SYS_ADMIN -> Sys_Permissions y Config_Workspace)
    // Asumiremos que el rol "Administrador Base" puede tener un ID conocido, pej: "RO-SYSI" o crear uno.
    const seedRoles = [
        {
            id_rol: "RO-SYSADMIN",
            nombre_rol: "Administrador del Sistema",
            descripcion: "Acceso total a estructuras de gobierno y topología."
        }
    ];

    const seedPermissions = [
        {
            id_permiso: "PERM-BOOT-PERM",
            id_rol: "RO-SYSADMIN",
            schema_destino: "Sys_Permissions",
            nivel_acceso: "ALL (Admin Total)"
        },
        {
            id_permiso: "PERM-BOOT-WORK",
            id_rol: "RO-SYSADMIN",
            schema_destino: "Config_Workspace",
            nivel_acceso: "ALL (Admin Total)"
        }
    ];

    if (typeof Engine_DB !== 'undefined') {
        Logger.log("Instalando Roles...");
        Engine_DB.upsertBatch("Sys_Roles", seedRoles, config);
        
        Logger.log("Instalando Permisos Root ABAC...");
        Engine_DB.upsertBatch("Sys_Permissions", seedPermissions, config);
    }

    // 2. Inyectar Tipografías por Defecto
    const seedTypography = [
        {
            id_tipografia: "TYPO-DEFAULT",
            nombre_pack: "Taxonomia Material Base",
            font_display: "Inter, sans-serif",
            font_h1: "Inter, sans-serif",
            font_h2: "Roboto, sans-serif",
            font_h3: "Roboto, sans-serif",
            font_sub: "Roboto, sans-serif",
            font_body: "Roboto, sans-serif",
            font_mini: "Roboto, sans-serif",
            font_caption: "Roboto, sans-serif",
            font_action: "Inter, sans-serif",
            base_size: "16px",
            scale_ratio: "1.250 (Major Third)",
            heading_weight: "600",
            heading_transform: "none",
            estado: "Activo"
        }
    ];

    if (typeof Engine_DB !== 'undefined') {
        Logger.log("Instalando empaquetado tipográfico inicial...");
        Engine_DB.upsertBatch("Config_Typography", seedTypography, config);
    }

    Logger.log("Operación completada con éxito. Registros hidratados.");
    return "Taxonomía Instanciada Correctamente.";
}

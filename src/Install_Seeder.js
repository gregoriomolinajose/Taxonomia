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

/**
 * Seeder de Acceso para Super Administrador.
 * Crea la identidad de la Persona ejecutando este script y lo enlaza al Rol SYSADMIN.
 */
function seedSuperAdminAccess() {
    Logger.log("Iniciando inyección de acceso de Super Administrador...");
    
    const email = Session.getActiveUser().getEmail();
    if (!email) {
        Logger.log("Error: No se pudo resolver el email del usuario activo.");
        return "Error: Verifica que corras el script con permisos del Workspace.";
    }

    const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, useCloudDB: false };
    
    if (typeof Engine_DB !== 'undefined') {
        Logger.log("Revisando si el usuario ya existe en Persona...");
        const response = Engine_DB.list('Persona', 'objects');
        let record = null;
        
        if (response && response.rows) {
             record = response.rows.find(p => p.email === email || p.correo === email);
        }

        if (record) {
             Logger.log("Usuario existente encontrado. Elevando a Super Admin (RO-SYSADMIN)...");
             record.id_rol = "RO-SYSADMIN";
             Engine_DB.upsertBatch("Persona", [record], config);
             return "Usuario existente elevado a Super Admin (RO-SYSADMIN).";
        } else {
             Logger.log("No existe perfil para " + email + ". Creando identidad temporal...");
             const newPersona = {
                 numero_empleado: "99999999",
                 nombre: "Super",
                 apellidos: "Administrador",
                 correo: email,
                 email: email, 
                 id_rol: "RO-SYSADMIN",
                 unidad_negocio: "IT",
                 departamento: "Sistemas",
                 centro_costo: "DIR",
                 cargo: "Super Admin",
                 modalidad: "Virtual",
                 esquema: "Interno",
                 rol_agil: "N/A"
             };
             
             Engine_DB.upsertBatch("Persona", [newPersona], config);
             return "Nuevo usuario creado exitosamente y ligado a Super Admin.";
        }
    } else {
        Logger.log("Error crítico: Engine_DB no está instanciado.");
        return "Fallo CUD: Engine_DB Missing";
    }
}

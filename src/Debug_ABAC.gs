function debugABAC() {
  const email = 'gregoriomolinajose@gmail.com';
  
  const ctx = Engine_ABAC.resolveTopologyFor(email);
  Logger.log("Topology Context: " + JSON.stringify(ctx));
  
  const allowCreateSysRoles = Engine_ABAC.validatePermission(email, 'create', 'Sys_Roles', null);
  Logger.log("Can create Sys_Roles? " + allowCreateSysRoles);
  
  const allowCreateSysPerms = Engine_ABAC.validatePermission(email, 'create', 'Sys_Permissions', null);
  Logger.log("Can create Sys_Permissions? " + allowCreateSysPerms);
  
  // Dump Persona and Rules
  const personas = Engine_ABAC._getCachedData('Persona');
  const persona = personas.find(p => (p.email || p.correo || "").toLowerCase() === email);
  Logger.log("Persona: " + JSON.stringify(persona));
  
  const roles = Engine_DB.list('Sys_Roles', 'objects');
  Logger.log("Roles: " + JSON.stringify(roles.rows));

  const perms = Engine_ABAC._getCachedData('Sys_Permissions');
  Logger.log("Permisos for SuperAdmin: ");
  perms.forEach(p => {
     if (p.id_rol === persona?.id_rol) {
         Logger.log(p.schema_destino + " -> " + p.nivel_acceso);
     }
  });

  return "done";
}

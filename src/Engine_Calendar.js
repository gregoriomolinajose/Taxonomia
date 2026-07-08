/**
 * Engine_Calendar.js
 * Motor agnóstico para interacciones con Google Calendar.
 */
var Engine_Calendar = (function() {

  /**
   * Crea un evento en el calendario principal del usuario activo usando API Avanzada.
   * @param {object} payload EventPayload
   * { title, startTimeISO, endTimeISO, description, attendees, location, meetingProvider }
   * @returns {string|null} El ID del evento creado o null si falla.
   */
  function createEvent(payload) {
    try {
      if (typeof Calendar === 'undefined') {
        console.warn("API Avanzada de Calendar no está disponible.");
        if (payload.meetingProvider === 'GOOGLE_MEET') {
            throw new Error("ERROR CRÍTICO: No se puede generar el enlace de Google Meet porque el servicio 'Google Calendar API' no ha sido habilitado en la consola de Google Apps Script (sección Servicios).");
        }
        // Fallback a CalendarApp si es posible, pero sin Meet
        if (typeof CalendarApp !== 'undefined') {
          console.warn("Usando Fallback a CalendarApp básico (Sin Meet).");
          const cal = CalendarApp.getDefaultCalendar();
          const evt = cal.createEvent(payload.title, new Date(payload.startTimeISO), new Date(payload.endTimeISO), {
            description: payload.description || "",
            location: payload.location || "",
            guests: payload.attendees ? payload.attendees.join(",") : "",
            sendInvites: true
          });
          return evt.getId();
        }
        return "mock-event-id"; 
      }

      const calendarId = 'primary';
      const event = {
        summary: payload.title,
        location: payload.location || "",
        description: payload.description || "",
        start: {
          dateTime: payload.startTimeISO,
          timeZone: typeof Session !== 'undefined' ? Session.getScriptTimeZone() : "America/Mexico_City"
        },
        end: {
          dateTime: payload.endTimeISO,
          timeZone: typeof Session !== 'undefined' ? Session.getScriptTimeZone() : "America/Mexico_City"
        },
        attendees: (payload.attendees || []).map(email => ({ email: email }))
      };

      let args = { sendUpdates: "all" };

      if (payload.meetingProvider === 'GOOGLE_MEET') {
        event.conferenceData = {
          createRequest: {
            requestId: "meet-" + new Date().getTime(),
            conferenceSolutionKey: {
              type: "hangoutsMeet"
            }
          }
        };
        args.conferenceDataVersion = 1;
      }

      let createdEvent = Calendar.Events.insert(event, calendarId, args);
      
      let meetLink = createdEvent.hangoutLink || null;
      let status = 'success';
      
      if (createdEvent.conferenceData && createdEvent.conferenceData.createRequest && createdEvent.conferenceData.createRequest.status) {
          status = createdEvent.conferenceData.createRequest.status.statusCode;
      }

      // Si Google devuelve 'pending', hacemos polling hasta 3 segundos
      let retries = 3;
      while (status === 'pending' && retries > 0 && typeof Utilities !== 'undefined') {
          Utilities.sleep(1000);
          createdEvent = Calendar.Events.get(calendarId, createdEvent.id);
          
          if (createdEvent.conferenceData && createdEvent.conferenceData.createRequest && createdEvent.conferenceData.createRequest.status) {
              status = createdEvent.conferenceData.createRequest.status.statusCode;
          }
          if (createdEvent.hangoutLink) {
              status = 'success'; 
          }
          retries--;
      }
      
      // Volvemos a extraer el enlace tras el polling
      meetLink = createdEvent.hangoutLink || null;
      if (!meetLink && createdEvent.conferenceData && createdEvent.conferenceData.entryPoints) {
          const videoPoint = createdEvent.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
          if (videoPoint) meetLink = videoPoint.uri;
      }
      
      console.log("Calendar Event created:", createdEvent.id, "Meet:", meetLink, "Status:", status);
      return {
        id: createdEvent.id,
        meetLink: meetLink,
        status: status,
        htmlLink: createdEvent.htmlLink,
        raw: JSON.stringify(createdEvent.conferenceData || {})
      };

    } catch (e) {
      console.error("Error en Engine_Calendar.createEvent:", e);
      return null;
    }
  }

  return {
    createEvent: createEvent
  };

})();

if (typeof module !== 'undefined') module.exports = Engine_Calendar;

if (typeof module !== 'undefined') module.exports = Engine_Calendar;

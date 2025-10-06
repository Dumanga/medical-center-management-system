import { formatAppointmentDate, formatAppointmentTime } from '@/lib/validation/appointment';

export const appointmentPatientSelect = {
  id: true,
  name: true,
  phone: true,
};

export function serializeAppointmentRecord(appointment) {
  if (!appointment) {
    return null;
  }

  return {
    id: appointment.id,
    patientId: appointment.patientId,
    patient: appointment.patient
      ? {
          id: appointment.patient.id,
          name: appointment.patient.name,
          phone: appointment.patient.phone,
        }
      : null,
    date: formatAppointmentDate(appointment.date),
    time: formatAppointmentTime(appointment.time),
    notes: appointment.notes ?? null,
    createdAt: appointment.createdAt?.toISOString ? appointment.createdAt.toISOString() : null,
    updatedAt: appointment.updatedAt?.toISOString ? appointment.updatedAt.toISOString() : null,
  };
}
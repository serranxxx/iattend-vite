import axios from 'axios'
import { supabaseAuthHeaders } from '../../lib/authHeaders'

// Banco de recordatorios (`reminder_templates`). Ver docs/recordatorios.md.

const API_URL = import.meta.env.VITE_API_URL

export const fetchReminderTemplates = async () =>
    axios.get(`${API_URL}/api/admin/reminder-templates`, { headers: await supabaseAuthHeaders() })

export const createReminderTemplate = async (payload) =>
    axios.post(`${API_URL}/api/admin/reminder-templates`, payload, { headers: await supabaseAuthHeaders() })

export const updateReminderTemplate = async (id, payload) =>
    axios.patch(`${API_URL}/api/admin/reminder-templates/${id}`, payload, { headers: await supabaseAuthHeaders() })

export const deleteReminderTemplate = async (id) =>
    axios.delete(`${API_URL}/api/admin/reminder-templates/${id}`, { headers: await supabaseAuthHeaders() })

export const reorderReminderTemplates = async (ids) =>
    axios.post(`${API_URL}/api/admin/reminder-templates/reorder`, { ids }, { headers: await supabaseAuthHeaders() })

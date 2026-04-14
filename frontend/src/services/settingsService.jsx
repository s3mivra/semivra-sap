import api from './api';
export const fetchSettings = async () => (await api.get('/settings')).data;
export const lockPeriod = async (lockedDate) => (await api.post('/settings/lock', { lockedDate })).data;
export const unlockPeriod = async () => (await api.post('/settings/unlock')).data;
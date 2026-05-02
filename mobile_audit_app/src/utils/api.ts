export const TUNNEL_URL = 'https://bids-deborah-florists-carefully.trycloudflare.com'; // Public Localtunnel (Permanent name)
// export const TUNNEL_URL = 'http://10.0.2.2:8000'; // emulator
// export const TUNNEL_URL = 'https://0a69-105-159-204-58.ngrok-free.app'; // ngrok

export const getApiUrl = (path: string) => {
  return path;
};

import axios from 'axios';

const api = axios.create({
  baseURL: TUNNEL_URL,
  timeout: 30000,
});

export default api;

export const API_PATHS = {
    LOGIN: '/audit/api/login/',
    REGISTER: '/audit/api/register/',
    PROFILE: '/audit/api/profile/',
    LOGOUT: '/audit/api/logout/',
    USERS: '/audit/api/users/',
    AUDITS: '/audit/api/audits/',
    LISTE_AUDIT: '/audit/api/liste-audit/',
    CRITERES: '/audit/api/criteres/',
    RESULTATS: '/audit/api/resultat-audit/',
    CHAPITRES: '/audit/api/chapitre-norme/',
    SOUS_CRITERES: '/audit/api/sous-criteres/',
    COTATION: '/audit/api/cotation/',
    TYPE_COTATION: '/audit/api/type-cotation/',
    TYPE_AUDIT: '/audit/api/type-audit/',
    TYPES_AUDIT: '/audit/api/type-audit/',
    SITES: '/Organisation/api/sites/',
    SECTIONS: '/Organisation/api/sections/',
    PROCESSUS: '/Organisation/api/processus/',
    TYPE_EQUIPEMENT: '/Organisation/api/types-equipements/',
    TYPES_EQUIPEMENTS: '/Organisation/api/types-equipements/',
    EQUIPEMENTS: '/Organisation/api/equipements/',
    NIVEAU_ATTENDU: '/Organisation/api/niveau-attendu/',
    PROCESSUS_DOCS: '/Organisation/api/processus-docs/',
    TYPE_PREUVE: '/audit/api/type-preuve/',
    PREUVE_ATTENDUE: '/audit/api/preuve-attendu/',
    DASHBOARD_STATS: '/audit/api/dashboard-stats/',
    STATS: '/audit/api/dashboard-stats/',
    CHART_DATA: '/audit/api/chart-data/',
    ACTIVITIES: '/audit/api/activities/',
    TEXT_REFS: '/audit/api/textref/',
    FORMULAIRES: '/audit/api/formulaire-audit/',
};

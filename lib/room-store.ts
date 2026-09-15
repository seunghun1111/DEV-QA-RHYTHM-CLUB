import {env} from 'cloudflare:workers';
export function roomStore(){if(!env.DB)throw new Error('Room storage unavailable');return env.DB;}

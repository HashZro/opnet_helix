import { JSONRpcProvider } from 'opnet';
import { RPC_URL, NETWORK } from '../config';

export const provider = new JSONRpcProvider(RPC_URL, NETWORK);

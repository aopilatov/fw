import { Api } from 'telegram';

export type MtProtoMessage = Api.Message;
export type MtProtoUser = Api.User;

export * from './mtproto';
export * from './api';
export * from './types';

import { Api } from 'telegram';

export type MtProtoMessage = Api.Message;
export type MtProtoUser = Api.User;

export * from './types';
export * from './message';
export * from './inject';
export * from './api';
export * from './mtproto';

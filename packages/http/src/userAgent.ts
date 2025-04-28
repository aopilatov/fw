import { FastifyRequest } from 'fastify';

import { mappingAlpha2CodesToLocaleLanguage } from './consts';
import { Device, UserAgent } from './types';

export class UserAgentParser {
	public static getDeviceInfo(headers: FastifyRequest['headers']): UserAgent {
		const userAgent = (headers?.['user-agent'] as string) || '';
		const device = (headers?.['x-device'] as Device) || '';
		const platform = (headers?.['x-platform'] as string) || '';
		const lang = (headers?.['x-lang'] as string) || '';

		let country: string | undefined = headers?.['x-origin-cf-ipcountry'] as string;
		if (!country) country = headers?.['cf-ipcountry'] as string;
		if (!country) country = undefined;

		const languageBasedOnCountry = country ? mappingAlpha2CodesToLocaleLanguage[country] || 'en' : 'en';

		const isMobile = /Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/.test(userAgent);
		const isTablet = /Tablet|iPad/.test(userAgent);
		const isDesktop = !isMobile && !isTablet;

		const isInAppBrowser = /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|WeChat|Weibo|Telegram|TelegramBot/.test(userAgent);

		let os = 'Unknown';
		let osVersion = 'Unknown';

		if (/Windows NT/.test(userAgent)) {
			os = 'Windows';
			osVersion = userAgent.match(/Windows NT ([\d.]+)/)?.[1] || 'Unknown';
		} else if (/Mac OS X/.test(userAgent)) {
			os = 'Mac OS';
			osVersion = userAgent.match(/Mac OS X ([\d_]+)/)?.[1].replace(/_/g, '.') || 'Unknown';
		} else if (/Android/.test(userAgent)) {
			os = 'Android';
			osVersion = userAgent.match(/Android ([\d.]+)/)?.[1] || 'Unknown';
		} else if (/iPhone|iPad|iPod/.test(userAgent)) {
			os = 'iOS';
			osVersion = userAgent.match(/OS ([\d_]+)/)?.[1].replace(/_/g, '.') || 'Unknown';
		} else if (/Linux/.test(userAgent)) {
			os = 'Linux';
		}

		return {
			lang,
			device,
			platform,
			userAgent,
			isMobile,
			isTablet,
			isDesktop,
			isInAppBrowser,
			os,
			osVersion,
			country,
			languageBasedOnCountry,
		};
	}
}

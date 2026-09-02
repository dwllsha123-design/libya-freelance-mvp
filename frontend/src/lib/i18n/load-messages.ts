import type { AppLocale } from '@/i18n/routing';

import arCommon from '../../../messages/ar/common.json';
import arBrand from '../../../messages/ar/brand.json';
import arNav from '../../../messages/ar/nav.json';
import arFooter from '../../../messages/ar/footer.json';
import arHome from '../../../messages/ar/home.json';
import arAuth from '../../../messages/ar/auth.json';
import arValidation from '../../../messages/ar/validation.json';
import arUi from '../../../messages/ar/ui.json';
import arErrors from '../../../messages/ar/errors.json';
import arDashboard from '../../../messages/ar/dashboard.json';
import arProjects from '../../../messages/ar/projects.json';
import arProposals from '../../../messages/ar/proposals.json';
import arFreelancers from '../../../messages/ar/freelancers.json';
import arEscrow from '../../../messages/ar/escrow.json';
import arPayments from '../../../messages/ar/payments.json';
import arMessaging from '../../../messages/ar/messaging.json';
import arNotifications from '../../../messages/ar/notifications.json';
import arProfile from '../../../messages/ar/profile.json';
import arPortfolio from '../../../messages/ar/portfolio.json';
import arNuqati from '../../../messages/ar/nuqati.json';
import arSearch from '../../../messages/ar/search.json';
import arAdmin from '../../../messages/ar/admin.json';
import arMarketing from '../../../messages/ar/marketing.json';

import enCommon from '../../../messages/en/common.json';
import enBrand from '../../../messages/en/brand.json';
import enNav from '../../../messages/en/nav.json';
import enFooter from '../../../messages/en/footer.json';
import enHome from '../../../messages/en/home.json';
import enAuth from '../../../messages/en/auth.json';
import enValidation from '../../../messages/en/validation.json';
import enUi from '../../../messages/en/ui.json';
import enErrors from '../../../messages/en/errors.json';
import enDashboard from '../../../messages/en/dashboard.json';
import enProjects from '../../../messages/en/projects.json';
import enProposals from '../../../messages/en/proposals.json';
import enFreelancers from '../../../messages/en/freelancers.json';
import enEscrow from '../../../messages/en/escrow.json';
import enPayments from '../../../messages/en/payments.json';
import enMessaging from '../../../messages/en/messaging.json';
import enNotifications from '../../../messages/en/notifications.json';
import enProfile from '../../../messages/en/profile.json';
import enPortfolio from '../../../messages/en/portfolio.json';
import enNuqati from '../../../messages/en/nuqati.json';
import enSearch from '../../../messages/en/search.json';
import enAdmin from '../../../messages/en/admin.json';
import enMarketing from '../../../messages/en/marketing.json';

const MESSAGES = {
  ar: {
    common: arCommon,
    brand: arBrand,
    nav: arNav,
    footer: arFooter,
    home: arHome,
    auth: arAuth,
    validation: arValidation,
    ui: arUi,
    errors: arErrors,
    dashboard: arDashboard,
    projects: arProjects,
    proposals: arProposals,
    freelancers: arFreelancers,
    escrow: arEscrow,
    payments: arPayments,
    messaging: arMessaging,
    notifications: arNotifications,
    profile: arProfile,
    portfolio: arPortfolio,
    nuqati: arNuqati,
    search: arSearch,
    admin: arAdmin,
    marketing: arMarketing,
  },
  en: {
    common: enCommon,
    brand: enBrand,
    nav: enNav,
    footer: enFooter,
    home: enHome,
    auth: enAuth,
    validation: enValidation,
    ui: enUi,
    errors: enErrors,
    dashboard: enDashboard,
    projects: enProjects,
    proposals: enProposals,
    freelancers: enFreelancers,
    escrow: enEscrow,
    payments: enPayments,
    messaging: enMessaging,
    notifications: enNotifications,
    profile: enProfile,
    portfolio: enPortfolio,
    nuqati: enNuqati,
    search: enSearch,
    admin: enAdmin,
    marketing: enMarketing,
  },
} as const;

export async function loadMessages(locale: AppLocale) {
  return MESSAGES[locale];
}

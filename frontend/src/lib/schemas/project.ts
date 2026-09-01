import { z } from 'zod';

export const projectFormSchema = z
  .object({
    title: z.string().min(10, 'العنوان يجب أن يكون 10 أحرف على الأقل').max(120),
    description: z.string().min(50, 'الوصف يجب أن يكون 50 حرفاً على الأقل').max(8000),
    categoryId: z.string().uuid('اختر التصنيف'),
    skillIds: z.array(z.string().uuid()).min(1, 'اختر مهارة واحدة على الأقل').max(15),
    budgetType: z.enum(['FIXED', 'HOURLY']),
    budgetMin: z.coerce.number().min(0),
    budgetMax: z.coerce.number().min(0),
    experienceLevel: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']),
    workMode: z.enum(['ON_SITE', 'REMOTE', 'HYBRID']),
    cityId: z.string().optional(),
    deadline: z.string().optional(),
  })
  .refine((d) => d.budgetMax >= d.budgetMin, {
    message: 'الحد الأقصى يجب أن يكون أكبر من أو يساوي الحد الأدنى',
    path: ['budgetMax'],
  })
  .refine(
    (d) => {
      if (d.workMode === 'REMOTE') return true;
      return Boolean(d.cityId);
    },
    { message: 'اختر المدينة', path: ['cityId'] },
  );

export type ProjectFormData = z.infer<typeof projectFormSchema>;

export const projectDraftSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(8000).optional(),
  categoryId: z.string().uuid(),
  skillIds: z.array(z.string().uuid()).max(15).optional(),
  budgetType: z.enum(['FIXED', 'HOURLY']).optional(),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  experienceLevel: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']).optional(),
  workMode: z.enum(['ON_SITE', 'REMOTE', 'HYBRID']).optional(),
  cityId: z.string().optional(),
  deadline: z.string().optional(),
});

export type ProjectStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export interface ProjectListItem {
  id?: string;
  slug: string;
  title: string;
  description: string;
  budgetType: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  experienceLevel: string;
  workMode: string;
  deadline?: string | null;
  publishedAt?: string | null;
  category: { nameAr: string; slug: string };
  city?: { nameAr: string; slug: string } | null;
  skills: { name: string; slug: string }[];
  client?: {
    username: string;
    displayName: string;
    profilePhoto?: string | null;
  } | null;
  proposalCount?: number;
}

export interface ManageProject extends ProjectListItem {
  id: string;
  status: ProjectStatus;
  closedAt?: string | null;
  completionRequestedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  skills: { id: string; name: string; slug: string }[];
  category: { id: string; nameAr: string; slug: string };
  city?: {
    id: string;
    nameAr: string;
    slug: string;
    isRemote: boolean;
  } | null;
  proposalCount: number;
  acceptedFreelancer?: {
    proposalId: string;
    username: string;
    displayName: string;
    profilePhoto?: string | null;
    professionalTitle?: string | null;
  } | null;
}

export interface PaginatedProjects {
  items: ProjectListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

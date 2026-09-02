import { z } from 'zod';

export type ValidationTranslator = (key: string) => string;

export function createLoginSchema(t: ValidationTranslator) {
  return z.object({
    email: z.string().email(t('invalidEmail')),
    password: z.string().min(8, t('passwordMin')),
  });
}

export function createRegisterSchema(t: ValidationTranslator) {
  return z
    .object({
      firstName: z.string().min(2, t('firstNameRequired')),
      lastName: z.string().min(2, t('lastNameRequired')),
      email: z.string().email(t('invalidEmail')),
      password: z
        .string()
        .min(8, t('passwordMin'))
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, t('passwordComplexity')),
      confirmPassword: z.string().min(8, t('confirmPasswordRequired')),
      role: z.enum(['FREELANCER', 'CLIENT'], { message: t('chooseRole') }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordMismatch'),
      path: ['confirmPassword'],
    });
}

export function createProjectFormSchema(t: ValidationTranslator) {
  return z
    .object({
      title: z.string().min(10, t('titleMin')).max(120),
      description: z.string().min(50, t('descriptionMin')).max(8000),
      categoryId: z.string().uuid(t('chooseCategory')),
      skillIds: z.array(z.string().uuid()).min(1, t('chooseSkill')).max(15),
      budgetType: z.enum(['FIXED', 'HOURLY']),
      budgetMin: z.coerce.number().min(0),
      budgetMax: z.coerce.number().min(0),
      experienceLevel: z.enum(['ENTRY', 'INTERMEDIATE', 'EXPERT']),
      workMode: z.enum(['ON_SITE', 'REMOTE', 'HYBRID']),
      cityId: z.string().optional(),
      deadline: z.string().optional(),
    })
    .refine((d) => d.budgetMax >= d.budgetMin, {
      message: t('budgetMaxMin'),
      path: ['budgetMax'],
    })
    .refine(
      (d) => {
        if (d.workMode === 'REMOTE') return true;
        return Boolean(d.cityId);
      },
      { message: t('chooseCity'), path: ['cityId'] },
    );
}

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ProjectFormData = z.infer<ReturnType<typeof createProjectFormSchema>>;

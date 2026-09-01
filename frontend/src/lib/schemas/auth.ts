import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'الاسم الأول مطلوب'),
    lastName: z.string().min(2, 'اسم العائلة مطلوب'),
    email: z.string().email('البريد الإلكتروني غير صالح'),
    password: z
      .string()
      .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        'يجب أن تحتوي على حرف كبير وصغير ورقم',
      ),
    confirmPassword: z.string().min(8, 'تأكيد كلمة المرور مطلوب'),
    role: z.enum(['FREELANCER', 'CLIENT'], {
      message: 'اختر نوع الحساب',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

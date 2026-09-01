import { BadRequestException } from '@nestjs/common';
import { ProjectStatus, WorkMode } from '@prisma/client';
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  MAX_PROJECT_SKILLS,
  TITLE_MAX,
  TITLE_MIN,
} from './projects.constants.js';

export interface ProjectInputData {
  title?: string;
  description?: string;
  categoryId?: string;
  skillIds?: string[];
  budgetMin?: number;
  budgetMax?: number;
  deadline?: Date | null;
  workMode?: WorkMode;
  cityId?: string | null;
}

export function validateProjectForDraft(data: ProjectInputData): void {
  if (data.title !== undefined) {
    if (data.title.trim().length < 3) {
      throw new BadRequestException('عنوان المشروع قصير جداً');
    }
    if (data.title.length > TITLE_MAX) {
      throw new BadRequestException(`العنوان يجب ألا يتجاوز ${TITLE_MAX} حرفاً`);
    }
  }

  if (data.description !== undefined && data.description.length > DESCRIPTION_MAX) {
    throw new BadRequestException('الوصف طويل جداً');
  }

  if (data.skillIds && data.skillIds.length > MAX_PROJECT_SKILLS) {
    throw new BadRequestException(
      `الحد الأقصى للمهارات هو ${MAX_PROJECT_SKILLS}`,
    );
  }

  validateBudget(data.budgetMin, data.budgetMax);
  validateDeadline(data.deadline);
  validateLocation(data.workMode, data.cityId);
}

export function validateProjectForPublish(data: ProjectInputData): void {
  if (!data.title || data.title.trim().length < TITLE_MIN) {
    throw new BadRequestException(
      `العنوان يجب أن يكون ${TITLE_MIN} أحرف على الأقل`,
    );
  }

  if (data.title.length > TITLE_MAX) {
    throw new BadRequestException(`العنوان يجب ألا يتجاوز ${TITLE_MAX} حرفاً`);
  }

  if (!data.description || data.description.trim().length < DESCRIPTION_MIN) {
    throw new BadRequestException(
      `الوصف يجب أن يكون ${DESCRIPTION_MIN} حرفاً على الأقل`,
    );
  }

  if (data.description.length > DESCRIPTION_MAX) {
    throw new BadRequestException('الوصف طويل جداً');
  }

  if (!data.categoryId) {
    throw new BadRequestException('التصنيف مطلوب');
  }

  if (!data.skillIds || data.skillIds.length === 0) {
    throw new BadRequestException('يجب اختيار مهارة واحدة على الأقل');
  }

  if (data.skillIds.length > MAX_PROJECT_SKILLS) {
    throw new BadRequestException(
      `الحد الأقصى للمهارات هو ${MAX_PROJECT_SKILLS}`,
    );
  }

  validateBudget(data.budgetMin, data.budgetMax, true);
  validateDeadline(data.deadline, true);
  validateLocation(data.workMode, data.cityId, true);
}

function validateBudget(
  budgetMin?: number,
  budgetMax?: number,
  required = false,
): void {
  if (budgetMin === undefined && budgetMax === undefined) {
    if (required) {
      throw new BadRequestException('الميزانية مطلوبة');
    }
    return;
  }

  if (budgetMin === undefined || budgetMax === undefined) {
    throw new BadRequestException('يجب تحديد الحد الأدنى والأقصى للميزانية');
  }

  if (budgetMin < 0 || budgetMax < 0) {
    throw new BadRequestException('الميزانية يجب أن تكون موجبة');
  }

  if (budgetMax < budgetMin) {
    throw new BadRequestException(
      'الحد الأقصى للميزانية يجب أن يكون أكبر من أو يساوي الحد الأدنى',
    );
  }
}

function validateDeadline(deadline?: Date | null, required = false): void {
  if (!deadline) {
    if (required) return;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (deadline < today) {
    throw new BadRequestException('موعد التسليم لا يمكن أن يكون في الماضي');
  }
}

function validateLocation(
  workMode?: WorkMode,
  cityId?: string | null,
  required = false,
): void {
  if (!workMode) {
    if (required) {
      throw new BadRequestException('نمط العمل مطلوب');
    }
    return;
  }

  if (workMode === WorkMode.REMOTE && cityId) {
    throw new BadRequestException('المشاريع عن بُعد لا تتطلب مدينة');
  }

  if (
    (workMode === WorkMode.ON_SITE || workMode === WorkMode.HYBRID) &&
    required &&
    !cityId
  ) {
    throw new BadRequestException('يجب اختيار المدينة لهذا نمط العمل');
  }
}

export class ProjectStateService {
  static assertCanEdit(status: ProjectStatus): void {
    if (status === ProjectStatus.DRAFT || status === ProjectStatus.OPEN) {
      return;
    }
    throw new BadRequestException('لا يمكن تعديل المشروع في هذه الحالة');
  }

  static assertCanDelete(status: ProjectStatus): void {
    if (status !== ProjectStatus.DRAFT) {
      throw new BadRequestException('يمكن حذف المسودات فقط');
    }
  }

  static assertCanPublish(status: ProjectStatus): void {
    if (status !== ProjectStatus.DRAFT) {
      throw new BadRequestException('يمكن نشر المسودات فقط');
    }
  }

  static assertCanClose(status: ProjectStatus): void {
    if (status !== ProjectStatus.OPEN) {
      throw new BadRequestException('يمكن إغلاق المشاريع المفتوحة فقط');
    }
  }

  static assertCanCancel(status: ProjectStatus): void {
    if (
      status !== ProjectStatus.DRAFT &&
      status !== ProjectStatus.OPEN
    ) {
      throw new BadRequestException('لا يمكن إلغاء المشروع في هذه الحالة');
    }
  }

  static transitionToOpen(): { status: ProjectStatus; publishedAt: Date } {
    return {
      status: ProjectStatus.OPEN,
      publishedAt: new Date(),
    };
  }

  static transitionToClosed(): {
    status: ProjectStatus;
    closedAt: Date;
  } {
    return {
      status: ProjectStatus.CLOSED,
      closedAt: new Date(),
    };
  }

  static transitionToCancelled(): { status: ProjectStatus } {
    return { status: ProjectStatus.CANCELLED };
  }

  static assertCanAcceptProposal(status: ProjectStatus): void {
    if (status !== ProjectStatus.OPEN) {
      throw new BadRequestException(
        'يمكن قبول العروض للمشاريع المفتوحة فقط',
      );
    }
  }

  static transitionToInProgress(
    acceptedProposalId: string,
  ): {
    status: ProjectStatus;
    acceptedProposalId: string;
  } {
    return {
      status: ProjectStatus.IN_PROGRESS,
      acceptedProposalId,
    };
  }

  static assertCanRequestCompletion(status: ProjectStatus): void {
    if (status !== ProjectStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'يمكن طلب الإتمام للمشاريع قيد التنفيذ فقط',
      );
    }
  }

  static assertCanComplete(status: ProjectStatus): void {
    if (status !== ProjectStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'يمكن إتمام المشاريع قيد التنفيذ فقط',
      );
    }
  }

  static transitionToCompleted(): {
    status: ProjectStatus;
    completedAt: Date;
  } {
    return {
      status: ProjectStatus.COMPLETED,
      completedAt: new Date(),
    };
  }
}

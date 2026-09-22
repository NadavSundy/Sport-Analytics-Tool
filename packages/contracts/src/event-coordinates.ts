import { z } from 'zod';

export const eventCoordinateSchema = z.number().int().min(0).max(32_767);

const DISPLAY_BALL_LABEL = /^(\d{1,5})\.(\d{1,2})$/;

export function validateDisplayBallLabel(
  label: string | undefined,
  overNumber: number,
  fieldName: 'ballLabel' | 'ballNumber',
  context: z.RefinementCtx,
): void {
  if (label === undefined) return;

  const match = DISPLAY_BALL_LABEL.exec(label);
  const displayName = fieldName === 'ballLabel' ? 'ball label' : 'ball number';
  if (!match) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [fieldName],
      message: `A ${displayName} takes the form <over>.<ball>, for example 5.1.`,
    });
    return;
  }

  if (Number(match[1]) !== overNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [fieldName],
      message: `The ${displayName} over must match overNumber.`,
    });
  }
}

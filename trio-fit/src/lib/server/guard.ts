/** Authorization primitive: a member may only touch records that belong to them. */
export class ForbiddenError extends Error {
  constructor(msg = 'You can only change your own records.') {
    super(msg);
    this.name = 'ForbiddenError';
  }
}
export function assertOwner(sessionMemberId: string, resourceMemberId: string | null | undefined): void {
  if (!resourceMemberId || resourceMemberId !== sessionMemberId) throw new ForbiddenError();
}


export async function checkMasterUsage(checks) {
  for (const check of checks) {
    const record = await check.model.findFirst({
      where: check.where,
      select: { id: true },
    });

    if (record) {
      return {
        canDelete: false,
        message: check.message,
      };
    }
  }

  return {
    canDelete: true,
    message: null,
  };
}

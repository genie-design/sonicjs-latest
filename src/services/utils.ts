export function uuid() {
  return crypto.randomUUID();
}

export function convertFormDataToObject(
  formData: FormData,
): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  formData.forEach((value: FormDataEntryValue, key: string) => {
    if (!Reflect.has(object, key)) {
      object[key] = value;
      return;
    }
    if (!Array.isArray(object[key])) {
      object[key] = [object[key]];
    }
    (object[key] as Array<FormDataEntryValue>).push(value);
  });
  return object;
}

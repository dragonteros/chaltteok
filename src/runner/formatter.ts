import { josa } from "josa";
import { getConcreteValues, StrictValuePack, Value } from "./values";

export function formatValue(value: Value): string {
  if (typeof value === "boolean") return value ? "참" : "거짓";
  switch (value.type) {
    case "열":
      return JSON.stringify(value.data.map(formatValue));
    default:
      return value.값.toString();
  }
}

export function formatValuePack(values: StrictValuePack): string {
  return josa(getConcreteValues(values).map(formatValue).join("#{과}"));
}

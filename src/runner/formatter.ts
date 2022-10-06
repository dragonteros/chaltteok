import { josa } from "josa";
import { TypeAnnotation, TypePack } from "src/finegrained/types";
import {
  getConcreteValues,
  StrictValuePack,
  Value,
} from "../finegrained/values";

export function formatValue(value: Value): string {
  if (typeof value === "boolean") return value ? "참" : "거짓";
  switch (value.type) {
    case "열":
      return "[" + value.data.map(formatValue).join(", ") + "]";
    default:
      return value.값.toString();
  }
}

export function formatValuePack(values: StrictValuePack): string {
  return josa(getConcreteValues(values).map(formatValue).join("#{과}"));
}

function _formatType(_type: TypePack["type"]): string {
  if (typeof _type === "string") return _type;
  return `${_formatType(_type.listOf)}열`;
}
export function formatType(annotation: TypeAnnotation): string {
  if (annotation === "new") return "새 변수";
  if (annotation === "any") return "임의";
  if (annotation === "lazy") return "임의";
  if ("variableOf" in annotation)
    return `${formatType(annotation.variableOf)} 변수`;
  return `${_formatType(annotation.type)} ${annotation.arity}개`;
}

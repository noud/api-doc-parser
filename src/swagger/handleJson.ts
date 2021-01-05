import get from "lodash.get";
import { OpenAPIV2 } from "openapi-types";
import { Field } from "../Field";
import { Resource } from "../Resource";
import { getResources } from "../utils/getResources";

export const removeTrailingSlash = (url: string): string => {
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
};

export default function (
  response: OpenAPIV2.Document,
  entrypointUrl: string,
  dialect: string
): Resource[] {
  const paths = getResources(response.paths);

  const resources = paths.map((item) => {
    const name = item.replace(`/`, ``);
    const url = removeTrailingSlash(entrypointUrl) + item;
    const firstMethod = Object.keys(
      response.paths[item]
    )[0] as keyof OpenAPIV2.PathItemObject;
    const responsePathItem = (response.paths[item] as OpenAPIV2.PathItemObject)[
      firstMethod
    ] as OpenAPIV2.OperationObject;

    if (!responsePathItem.tags) {
      throw new Error(); // @TODO
    }

    const title = responsePathItem.tags[0];

    if (!response.definitions) {
      throw new Error(); // @TODO
    }

    const definition = response.definitions[title];

    if (!definition) {
      throw new Error(); // @TODO
    }

    const properties = definition.properties;

    if (!properties) {
      throw new Error(); // @TODO
    }

    const fieldNames = Object.keys(properties);
    const requiredFields = get(
      response,
      ["definitions", title, "required"],
      []
    ) as string[];

    const fields = fieldNames.map(
      (fieldName) => {
        let field: any = {
          id: null,
          range: null,
          required: !!requiredFields.find((value) => value === fieldName),
          description: get(properties[fieldName], `description`, ``),
        };
        if ("foreign_key_id" === dialect) {
          if (fieldName.includes("_id")) {
            field.reference = {name: fieldName.substring( 0, fieldName.indexOf( "_id" ) ), url: ""};
            field.maxCardinality = 1;
          }
        }
        new Field(fieldName, field)
      });

    return new Resource(name, url, {
      id: null,
      title,
      fields,
      readableFields: fields,
      writableFields: fields,
    });
  });

  return resources;
}

import { getApiDocs } from "@/lib/swagger";
import ReactSwagger from "./react-swagger";
import RemoveBodyClasses from "./remove-body-classes";

export default async function ApiDocsPage() {
  const spec = await getApiDocs();

  return (
    <>
      <RemoveBodyClasses />

      <div className="api-docs-page">
        <ReactSwagger spec={spec} />
      </div>
    </>
  );
}
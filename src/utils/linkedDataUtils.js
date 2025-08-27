import * as N3 from "n3";
import { Store } from "n3";
import { QueryEngine } from "@comunica/query-sparql";
import jsonld from "jsonld";

const engine = new QueryEngine();

export const comunicaQuery = async (query, og_sources) => {
  return await engine.queryBindings(query, {
    sources: [og_sources],
  });
};

export function createEmptyStore() {
  var storeN3 = new Store();
  //console.log("store", storeN3); //N3 works
  return storeN3;
}

export async function getLinkedDataNQuads(uri, store) {
  const return_formats = [
    "text/turtle",
    "application/ld+json",
    "application/vnd.schemaorg.ld+json",
    "text/html",
    /*
    "application/rdf+xml",
    "application/n-triples",
    "application/n-quads",
    "text/n3",
    "text/rdf+n3",
    */
  ];

  let filteredFormats = return_formats;

  const to_get = filteredFormats.length > 0 ? filteredFormats : return_formats;
  console.log("To get:", to_get);

  const data = await getData(uri, to_get);
  let text = await data.response.text();
  console.warn(text);
  console.warn(data.format);

  if (data.format.includes("text/html")) {
    const signpostedData = await getSignpostedDataFromHtml(text);
    if (signpostedData) {
      text = signpostedData.content;
      data.format = signpostedData.format;
    }
  }

  console.info("data format: ", data.format);
  console.info("data text: ", text);

  let quads;
  if (
    data.format.includes("application/ld+json") ||
    data.format.includes("application/vnd.schemaorg.ld+json")
  ) {
    try {
      // Parse JSON-LD
      const jsonldDoc = JSON.parse(text);
      // get the  @context from the jsonldDoc if it exists
      // and gets the context from the uri
      // then replace the context in the jsonldDoc

      if (jsonldDoc["@context"]) {
        let to_compact = jsonldDoc["@context"] + "/docs/jsonldcontext.jsonld";
        jsonldDoc["@context"] = to_compact;
        // replace the http with https
        jsonldDoc["@context"] = jsonldDoc["@context"].replace(
          "http://",
          "https://"
        );
        jsonldDoc["@context"] = await jsonld.compact(
          jsonldDoc,
          jsonldDoc["@context"]
        );
      }

      console.warn(jsonldDoc);
      const nquads = await jsonld.toRDF(jsonldDoc, {
        format: "application/n-quads",
      });
      console.warn(nquads);
      const parser = new N3.Parser({ format: "N-Quads" });
      quads = parser.parse(nquads.toString());
      console.warn(quads);
    } catch (error) {
      console.error("Error parsing JSON-LD:", error);
      throw error;
    }
  } else {
    // Parse other RDF formats
    const parser = new N3.Parser({ format: data.format });
    try {
      quads = parser.parse(text);
    } catch (error) {
      console.log("parsing error", error);
      throw error;
    }
  }

  for (const quad of quads) {
    store.addQuad(quad);
  }

  return store;
}

export async function getSignpostedDataFromHtml(html) {
  try {
    console.log("Parsing signposted data from HTML");
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const scriptTags = doc.querySelectorAll(
      'script[rel="describedby"], script[type="application/ld+json"]'
    );
    for (const script of scriptTags) {
      if (script.getAttribute("rel") === "describedby") {
        const format = script.getAttribute("type") || "text/html";
        const content = script.textContent || "";
        return { format, content };
      } else if (script.getAttribute("type") === "application/ld+json") {
        const format = "application/ld+json";
        const content = script.textContent || "";
        return { format, content };
      }
    }

    return null;
  } catch (error) {
    console.error("Error parsing signposted data:", error);
    return null;
  }
}

async function getData(uri, formats) {
  for (const format of formats) {
    try {
      const response = await fetch(uri, { headers: { Accept: format } });
      const contentType = response.headers.get("Content-Type");

      console.log("Response:", response);
      console.log("Content Type:", contentType);

      if (response.ok && contentType?.includes(format)) {
        return { format, response };
      }
    } catch (error) {
      console.log(error);
    }
  }
}

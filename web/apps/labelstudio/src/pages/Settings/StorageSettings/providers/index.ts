import azureProvider from "./azure";
import azureSpiProvider from "./azure_spi";
import databricksProvider from "./databricks";
import gcsProvider from "./gcs";
import gcsWifProvider from "./gcswif";
import localFilesProvider from "./localFiles";
import redisProvider from "./redis";
import { s3Provider } from "./s3";
import s3sProvider from "./s3s";

// Order matches ProviderGrid rows at xl:grid-cols-4: AWS+Azure, then GCS variants+Redis, then rest.
export const providers = {
  s3: s3Provider,
  s3s: s3sProvider,
  azure: azureProvider,
  azure_spi: azureSpiProvider,
  gcs: gcsProvider,
  gcswif: gcsWifProvider,
  redis: redisProvider,
  databricks: databricksProvider,
  localfiles: localFilesProvider,
};

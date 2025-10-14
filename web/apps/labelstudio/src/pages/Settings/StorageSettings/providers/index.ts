import azureProvider from "./azure";
import azureSpiProvider from "./azure_spi";
import b2Provider from "./b2";
import databricksProvider from "./databricks";
import gcsProvider from "./gcs";
import gcsWifProvider from "./gcswif";
import localFilesProvider from "./localFiles";
import redisProvider from "./redis";
import { s3Provider } from "./s3";
import s3sProvider from "./s3s";

export const providers = {
  // Standard providers
  s3: s3Provider,
  b2: b2Provider,
  gcs: gcsProvider,
  azure: azureProvider,
  redis: redisProvider,
  // Enterprise providers
  databricks: databricksProvider,
  s3s: s3sProvider,
  gcswif: gcsWifProvider,
  azure_spi: azureSpiProvider,
  // Local provider
  localfiles: localFilesProvider,
};

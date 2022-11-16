export interface Settings {
  name: string;
  environment: string;
  region: string;
  uiDeployment: boolean;
  uiBucketName: string;
  nodeVersion?: string;
  lambdaBucketName: string;
  setupDomain: boolean;
  domainZoneId: string;
  ACMCertificateArn: string;
}

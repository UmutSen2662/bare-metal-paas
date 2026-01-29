export interface App {
  id: number;
  name: string;
  repo_url: string;
  domain: string;
  language_version: string;
  port: number;
  build_command: string;
  start_command: string;
  deploy_token?: string;
  status: string;
}

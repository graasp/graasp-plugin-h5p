const { src, dest } = require('gulp');
const path = require('path');
const mustache = require('gulp-mustache');

/**
 * Creates a Gulp task to inject environment variables into the H5P
 * integration index file, and writes them to the dist folder
 */
function generateIntegration() {
  const input = path.resolve(__dirname, 'src/public/integration.html');
  const output = path.resolve(__dirname, 'dist/public/');

  const env = {
    H5P_ASSETS_BASE_URL: process.env.H5P_ASSETS_BASE_URL,
    H5P_CONTENT_BASE_URL: process.env.H5P_CONTENT_BASE_URL,
    H5P_HOST_DOMAINS: Object.entries(process.env)
      .filter(([key]) => key.startsWith('H5P_HOST_DOMAIN_'))
      .map(([_, value]) => value),
  };

  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) {
      throw new Error(`Environment variable ${key} is undefined!`);
    }
  });

  if (env.H5P_HOST_DOMAINS.length < 1) {
    throw new Error(`No H5P_HOST_DOMAIN_* environment variable was specified`);
  }

  env.H5P_HOST_DOMAINS.forEach((domain) => {
    if (!domain.match(/^https?:\/\//)) {
      throw new Error(`H5P host domain ${domain} should start with http(s)://`);
    }
  });

  return src(input).pipe(mustache(env)).pipe(dest(output));
}

exports.default = generateIntegration;

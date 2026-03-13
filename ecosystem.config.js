module.exports = {
  apps: [{
    name: 'bmt-app',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/bmt-app',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}

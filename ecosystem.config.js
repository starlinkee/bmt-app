module.exports = {
  apps: [{
    name: 'bmt-app',
    script: 'node_modules/.bin/next',
    args: 'start -p 3001',
    cwd: '/var/www/bmt-app',
    env: {
      NODE_ENV: 'production',
      HOSTNAME: '0.0.0.0'
    }
  }]
}

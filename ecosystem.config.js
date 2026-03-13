module.exports = {
  apps: [{
    name: 'bmt-app',
    script: '.next/standalone/server.js',
    cwd: '/var/www/bmt-app',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOSTNAME: '0.0.0.0'
    }
  }]
}

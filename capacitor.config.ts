import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.orbit.agentstudio',
  appName: 'Orbit',
  webDir: 'dist',
  android: {
    backgroundColor: '#F7F8F5',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config

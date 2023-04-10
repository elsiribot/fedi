/**
 * @format
 */
import { AppRegistry } from 'react-native'
import 'react-native-gesture-handler'
import 'react-native-reanimated'

import App from './App'
import { name as appName } from './app.json'
import './localization/i18n'

AppRegistry.registerComponent(appName, () => App)

import { DocumentDirectoryPath } from 'react-native-fs'
import Share from 'react-native-share'

export function shareLogs() {
    return Share.open({
        title: 'Fedi logs',
        url: `file://${DocumentDirectoryPath}/fedi.log`,
        type: 'text/plain',
    })
}

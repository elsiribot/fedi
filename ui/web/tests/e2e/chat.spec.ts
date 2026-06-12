import {
    ALL_GROUPS,
    BROADCAST_GROUP,
    KNOCKABLE_GROUPS,
    PRIVATE_GROUP,
} from './fixtures/chat-groups'
import { test, expect } from './fixtures/test'

// Replicates the native appium Chat e2e
// (ui/native/tests/appium/common/Chat.test.ts): an admin creates the four
// group shapes and messages each, a second user knocks on the private ones,
// the admin accepts one knock and declines the other, and the second user
// lands in the accepted room and can re-knock the declined one.
test('groups are created and knock requests are resolved', async ({
    chat,
    knockerChat,
}) => {
    // Two onboardings plus several matrix sync round-trips outlast even the
    // long shared timeout.
    test.setTimeout(600_000)

    // Admin: create each group shape and message it.
    await chat.onboardWithNewSeed()
    const roomIds: Record<string, string> = {}
    for (const group of ALL_GROUPS) {
        roomIds[group.name] = await chat.createGroupAndSendMessage(group)
    }
    await chat.goToChatList()
    for (const group of ALL_GROUPS) {
        await chat.expectRoomTileWithPreview(group)
    }

    // Knocker: a brand-new user requests to join both private groups.
    await knockerChat.onboardWithNewSeed()
    for (const group of KNOCKABLE_GROUPS) {
        await knockerChat.knockOnRoom(roomIds[group.name])
    }
    await knockerChat.goToChatList()
    for (const group of KNOCKABLE_GROUPS) {
        await expect(knockerChat.roomTile(group.name)).toBeVisible({
            timeout: 60_000,
        })
    }

    // Admin: accept the knock in one room, decline it in the other.
    await chat.respondToOnlyKnock(PRIVATE_GROUP.name, 'accept')
    await chat.respondToOnlyKnock(BROADCAST_GROUP.name, 'decline')

    // Knocker: the accepted room is writeable; the declined one can be
    // knocked again.
    await knockerChat.expectRoomIsWriteable(PRIVATE_GROUP.name)
    await knockerChat.knockOnRoom(roomIds[BROADCAST_GROUP.name])
})

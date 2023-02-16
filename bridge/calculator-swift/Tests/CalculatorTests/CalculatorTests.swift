import XCTest
@testable import Fedi

final class FediTests: XCTestCase {
    func testFedi() throws {
        let calcSize = FediSize.small
        let calcData = FediData(model: "test", size: calcSize)
        let calc = Fedi(info: calcData)
        let two = calc.add(a: 1, b: 1)
        XCTAssertEqual(two, 2)
    }
}

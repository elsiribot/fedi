//
//  ContentView.swift
//  FediFFIExample
//
//  Created by Steven Myers on 11/16/22.
//

import SwiftUI
import Fedi

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundColor(.accentColor)
            let calcSize = FediSize.small
            let calcData = FediData(model: "test", size: calcSize)
            let calc = Fedi(info: calcData)
            let two = calc.add(a: 1, b: 1)
            Text("1 + 1 = " + String(two))
        }
        .padding()
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

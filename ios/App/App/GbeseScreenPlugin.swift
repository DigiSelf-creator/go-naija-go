import UIKit
import Capacitor

/**
 * Gbese!'s own small screen plugin on iPhone (ST1c), the same calls as the Android one
 * (android/app/src/main/java/com/coachnaz/gbese/GbeseScreenPlugin.java), called from
 * src/native/app.ts:
 * - setPlayMode({ awake, blockEdges }): keep the screen awake (runs and the intro only,
 *   ST0 part 5 rule 6), and in a run let the home bar fade and need a second swipe (blockEdges);
 * - getInsets() and the "insets" event: the real safe edges (notch, island, round corners,
 *   home bar) in CSS pixels. In the app's web view one CSS pixel is one iPhone point.
 */
@objc(GbeseScreenPlugin)
public class GbeseScreenPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GbeseScreenPlugin"
    public let jsName = "GbeseScreen"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setPlayMode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getInsets", returnType: CAPPluginReturnPromise)
    ]

    private var lastInsets: [String: Double] = ["top": 0, "right": 0, "bottom": 0, "left": 0]

    private var gbeseViewController: GbeseViewController? {
        return bridge?.viewController as? GbeseViewController
    }

    override public func load() {
        DispatchQueue.main.async { [weak self] in
            self?.gbeseViewController?.onSafeAreaChange = { [weak self] insets in
                self?.report(insets, notify: true)
            }
        }
    }

    private func report(_ insets: UIEdgeInsets, notify: Bool) {
        let next: [String: Double] = [
            "top": Double(insets.top),
            "right": Double(insets.right),
            "bottom": Double(insets.bottom),
            "left": Double(insets.left)
        ]
        if next == lastInsets { return }
        lastInsets = next
        if notify { notifyListeners("insets", data: next) }
    }

    @objc func getInsets(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if let view = self.bridge?.viewController?.view {
                self.report(view.safeAreaInsets, notify: false)
            }
            call.resolve(self.lastInsets)
        }
    }

    @objc func setPlayMode(_ call: CAPPluginCall) {
        let awake = call.getBool("awake") ?? false
        let blockEdges = call.getBool("blockEdges") ?? false
        DispatchQueue.main.async { [weak self] in
            UIApplication.shared.isIdleTimerDisabled = awake
            self?.gbeseViewController?.inRun = blockEdges
            call.resolve()
        }
    }
}

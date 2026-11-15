import UIKit
import Capacitor

/**
 * The store app on iPhone (ST1c, docs/design.md ST0). The game itself is the built web game
 * inside the app (App/public); this only sets up the screen:
 * - sideways only, both ways (Info.plist lists landscape left and right only; ST0 part 2);
 * - the top bar (time, battery) hidden in the whole app (ST0 part 4, rule 4);
 * - in a run, the home bar fades out and leaving needs a second swipe up (ST0 part 4, rule 5).
 *   On menus and the city it works as normal. GbeseScreenPlugin.setPlayMode switches it.
 * The picture fills the whole screen; GbeseScreenPlugin gives the page the real safe edges.
 */
class GbeseViewController: CAPBridgeViewController {

    /** True while a run is being played (set by GbeseScreenPlugin.setPlayMode, blockEdges). */
    var inRun = false {
        didSet {
            guard inRun != oldValue else { return }
            homeBar.autoHidden = inRun
            setNeedsUpdateOfHomeIndicatorAutoHidden()
            setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
        }
    }

    /**
     * Capacitor's own SystemBars code already answers prefersHomeIndicatorAutoHidden for this
     * controller (and cannot be overridden here), and with the shared `hidden: true` setting it
     * would hide the home bar on every screen. UIKit asks childForHomeIndicatorAutoHidden first,
     * so this small empty child gives our answer: hidden in runs only.
     */
    private let homeBar = HomeBarRule()

    override var childForHomeIndicatorAutoHidden: UIViewController? {
        return homeBar
    }

    /** Told whenever the safe edges change (a flip, a size change). */
    var onSafeAreaChange: ((UIEdgeInsets) -> Void)?

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(GbeseScreenPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        addChild(homeBar)
        view.addSubview(homeBar.view)
        homeBar.didMove(toParent: self)
        // The game's own dark green behind everything, so a flip never shows white.
        let green = UIColor(red: 0x0f / 255.0, green: 0x1a / 255.0, blue: 0x12 / 255.0, alpha: 1)
        view.backgroundColor = green
        webView?.backgroundColor = green
        webView?.isOpaque = false
        webView?.scrollView.backgroundColor = green
        // No swipe back or forward through pages: there is only the one game page.
        webView?.allowsBackForwardNavigationGestures = false
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        onSafeAreaChange?(view.safeAreaInsets)
    }

    override var prefersStatusBarHidden: Bool {
        return true
    }

    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge {
        return inRun ? .bottom : []
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .landscape
    }
}

/** An empty, hidden child that only says whether the home bar fades (see childForHomeIndicatorAutoHidden). */
final class HomeBarRule: UIViewController {
    var autoHidden = false

    override func loadView() {
        let empty = UIView(frame: .zero)
        empty.isHidden = true
        empty.isUserInteractionEnabled = false
        view = empty
    }

    override var prefersHomeIndicatorAutoHidden: Bool {
        return autoHidden
    }
}

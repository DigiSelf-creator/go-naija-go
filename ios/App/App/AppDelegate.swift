import UIKit
import AVFoundation
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        useAmbientSound()
        keepSavesOffBackup()
        // The app uses scenes, so these come as notifications, not as the old delegate calls.
        let centre = NotificationCenter.default
        // WebKit can make its folders again while the game runs; mark them again each time.
        centre.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            self?.keepSavesOffBackup()
        }
        // After a call another app may have changed the sound kind; put ours back.
        centre.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.useAmbientSound()
        }
        return true
    }

    /**
     * Decision 22 and ST0 part 5 rules 4 and 7: the "ambient" sound kind. The silent switch wins
     * (in silent mode the game makes no sound), and the player's own music keeps playing under ours.
     */
    private func useAmbientSound() {
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [])
    }

    /**
     * Decision 59 and ST0 part 9 note 9: the saved game stays on this phone only. The page's
     * localStorage (the hero, Lagos, every save) lives in Library/WebKit, so that folder is kept
     * out of the iCloud and computer backup. The saves themselves are never moved or cleared.
     */
    private func keepSavesOffBackup() {
        let files = FileManager.default
        guard let library = files.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
        for name in ["WebKit", "Caches"] {
            var folder = library.appendingPathComponent(name, isDirectory: true)
            try? files.createDirectory(at: folder, withIntermediateDirectories: true)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? folder.setResourceValues(values)
        }
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

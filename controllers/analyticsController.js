const Content = require('../models/Content');
const User = require('../models/User');

const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total content generated
    const totalGenerated = await Content.countDocuments({
      user: userId,
      status: 'completed'
    });

    // Content generated last 7 days
    const last7Days = await Content.aggregate([
      {
        $match: {
          user: req.user._id,
          status: 'completed',
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Tone breakdown
    const toneBreakdown = await Content.aggregate([
      {
        $match: {
          user: req.user._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$tone',
          count: { $sum: 1 }
        }
      }
    ]);

    // Credits used
    const user = await User.findById(userId);
    const creditsUsed = 5 - user.credits < 0 ? 0 : 5 - user.credits;

    // Recent content
    const recentContent = await Content.find({
      user: userId,
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('topic tone createdAt');

    // Fill missing days with 0
    const last7DaysMap = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      last7DaysMap[key] = 0;
    }
    last7Days.forEach(d => {
      last7DaysMap[d._id] = d.count;
    });

    const dailyData = Object.entries(last7DaysMap).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      generations: count
    }));

    const toneData = toneBreakdown.map(t => ({
      name: t._id.charAt(0).toUpperCase() + t._id.slice(1),
      value: t.count
    }));

    res.status(200).json({
      success: true,
      analytics: {
        totalGenerated,
        creditsUsed,
        creditsRemaining: user.credits,
        plan: user.plan,
        dailyData,
        toneData,
        recentContent,
        totalFormats: totalGenerated * 5
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = { getAnalytics };
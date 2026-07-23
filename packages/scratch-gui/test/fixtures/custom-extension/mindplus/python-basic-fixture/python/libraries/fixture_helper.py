"""Mind+ Python 兼容测试包的本地运行库。"""


def read_status(mode):
    """返回固定状态，测试包不访问真实硬件。"""
    return 1 if mode in ("fast", "stable") else 0

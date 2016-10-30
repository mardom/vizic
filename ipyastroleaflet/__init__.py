from ._version import version_info, __version__

from .astroleaflet import AstroMap, GridLayer, NotebookUrl, AstroColorPicker, PopupDis
from .connection import Connection


def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'jupyter-astro-leaflet',
        'require': 'jupyter-astro-leaflet/extension'
    }]

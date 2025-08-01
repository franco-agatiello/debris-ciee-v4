import requests
import pandas as pd

# URLs de las APIs
url_onlo = 'https://www.space-track.org/basicspacedata/query/class/decay/orderby/NORAD_CAT_ID%20desc/emptyresult/show'
url_tip = 'https://www.space-track.org/basicspacedata/query/class/tip/orderby/NORAD_CAT_ID%20desc/emptyresult/show'

# NOTA: Puede que necesites autenticarte. Revisa la documentación de Space-Track.org para ver si necesitas un token o credenciales en la cabecera.

try:
    # 1. Obtener los datos de las APIs
    response_onlo = requests.get(url_onlo)
    response_tip = requests.get(url_tip)

    # Verificar si las solicitudes fueron exitosas
    response_onlo.raise_for_status()
    response_tip.raise_for_status()

    # 2. Cargar los datos JSON en dataframes de pandas
    data_onlo = pd.DataFrame(response_onlo.json())
    data_tip = pd.DataFrame(response_tip.json())

    # 3. Unificar los datos usando 'NORAD_CAT_ID'
    # Usamos un 'merge' para combinar los dataframes
    reporte_unificado = pd.merge(data_onlo, data_tip, on='NORAD_CAT_ID', how='inner', suffixes=('_onlo', '_tip'))

    # Limpiar columnas duplicadas que no son necesarias
    # Por ejemplo, 'OBJECT_NUMBER' es lo mismo que 'NORAD_CAT_ID'
    if 'OBJECT_NUMBER_tip' in reporte_unificado.columns:
        reporte_unificado.drop(columns=['OBJECT_NUMBER_tip'], inplace=True)
    if 'OBJECT_NUMBER_onlo' in reporte_unificado.columns:
        reporte_unificado.drop(columns=['OBJECT_NUMBER_onlo'], inplace=True)

    # 4. Guardar el resultado en un archivo CSV
    reporte_unificado.to_csv('reporte_unificado.csv', index=False)
    print("El reporte unificado ha sido creado exitosamente como 'reporte_unificado.csv'")

except requests.exceptions.RequestException as e:
    print(f"Error al conectar con la API: {e}")
except ValueError:
    print("Error al decodificar el JSON. El formato de la respuesta podría ser incorrecto.")
except Exception as e:
    print(f"Ocurrió un error: {e}")

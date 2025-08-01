import requests
import pandas as pd

# URLs de las APIs
url_onlo = 'https://www.space-track.org/basicspacedata/query/class/decay/orderby/NORAD_CAT_ID%20desc/emptyresult/show'
url_tip = 'https://www.space-track.org/basicspacedata/query/class/tip/orderby/NORAD_CAT_ID%20desc/emptyresult/show'
url_login = 'https://www.space-track.org/ajaxauth/login'

# ** Tus credenciales de Space-Track.org **
# Reemplaza 'TU_USUARIO' y 'TU_CONTRASEÑA' con tus datos reales
username = 'franco.r.agatiello@gmail.com'
password = 'francospacedebris2025'

# Parámetros de la solicitud de login
login_params = {
    'identity': username,
    'password': password
}

try:
    # Crear una sesión para mantener la autenticación
    with requests.Session() as s:
        # 1. Autenticarse en la API
        login_response = s.post(url_login, data=login_params)
        login_response.raise_for_status() # Lanza un error si la autenticación falla

        print("Autenticación exitosa. Obteniendo datos...")

        # 2. Obtener los datos de las APIs usando la sesión autenticada
        response_onlo = s.get(url_onlo)
        response_tip = s.get(url_tip)

        # Verificar si las solicitudes fueron exitosas
        response_onlo.raise_for_status()
        response_tip.raise_for_status()

        # 3. Cargar los datos JSON en dataframes de pandas
        data_onlo = pd.DataFrame(response_onlo.json())
        data_tip = pd.DataFrame(response_tip.json())

        # 4. Unificar los datos usando 'NORAD_CAT_ID'
        reporte_unificado = pd.merge(data_onlo, data_tip, on='NORAD_CAT_ID', how='inner', suffixes=('_onlo', '_tip'))

        # Limpiar columnas duplicadas que no son necesarias
        if 'OBJECT_NUMBER_tip' in reporte_unificado.columns:
            reporte_unificado.drop(columns=['OBJECT_NUMBER_tip'], inplace=True)
        if 'OBJECT_NUMBER_onlo' in reporte_unificado.columns:
            reporte_unificado.drop(columns=['OBJECT_NUMBER_onlo'], inplace=True)

        # 5. Guardar el resultado en un archivo CSV
        reporte_unificado.to_csv('reporte_unificado.csv', index=False)
        print("El reporte unificado ha sido creado exitosamente como 'reporte_unificado.csv'")

except requests.exceptions.RequestException as e:
    print(f"Error al conectar con la API o al autenticarse: {e}")
except ValueError:
    print("Error al decodificar el JSON. El formato de la respuesta podría ser incorrecto.")
except Exception as e:
    print(f"Ocurrió un error inesperado: {e}")

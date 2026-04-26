from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
import json
from .models import TypeAudit, TextRef, ChapitreNorme, Critere, SousCritere, TypePreuve, TypeCotation, FormulaireAudit, ListeAudit, ResultatAudit, PreuveAttendu, SousCritereTypeAudit, FormulaireSousCritere
from django.utils.decorators import method_decorator
from django.views import View


@method_decorator(csrf_exempt, name='dispatch')
class LoginAPIView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return JsonResponse({
                    'status': 'success',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'is_superuser': user.is_superuser,
                        'is_staff': user.is_staff
                    }
                })
            else:
                return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutAPIView(View):
    def post(self, request):
        logout(request)
        return JsonResponse({'status': 'success', 'message': 'Logged out successfully'})


@method_decorator(csrf_exempt, name='dispatch')
class TypeAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        type_audits = TypeAudit.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(type_audits)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            type_audit = TypeAudit.objects.create(name=data['name'])
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_audit.id,
                    'name': type_audit.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypeAuditDetailAPIView(View):
    def get(self, request, pk):
        # Temporarily removed authentication for testing
        try:
            type_audit = TypeAudit.objects.get(pk=pk)
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_audit.id,
                    'name': type_audit.name
                }
            })
        except TypeAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
    
    def put(self, request, pk):
        # Temporarily removed authentication for testing
        try:
            type_audit = TypeAudit.objects.get(pk=pk)
            data = json.loads(request.body)
            
            type_audit.name = data.get('name', type_audit.name)
            type_audit.save()
            
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_audit.id,
                    'name': type_audit.name
                }
            })
        except TypeAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    def delete(self, request, pk):
        # Temporarily removed authentication for testing
        try:
            type_audit = TypeAudit.objects.get(pk=pk)
            type_audit.delete()
            return JsonResponse({'status': 'success', 'message': 'Deleted successfully'})
        except TypeAudit.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Not found'}, status=404)


@method_decorator(csrf_exempt, name='dispatch')
class ChapitreNormeListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        chapitres = ChapitreNorme.objects.all().values('id', 'name', 'text_ref', 'text_ref__norme')
        return JsonResponse({'status': 'success', 'data': list(chapitres)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign key exists
            try:
                TextRef.objects.get(id=data['text_ref'])
            except TextRef.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'TextRef with id {data["text_ref"]} does not exist'}, status=400)
            
            chapitre = ChapitreNorme.objects.create(
                name=data['name'],
                text_ref_id=data['text_ref']
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': chapitre.id,
                    'name': chapitre.name,
                    'text_ref': chapitre.text_ref.id,
                    'text_ref_norme': chapitre.text_ref.norme
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class CritereListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        criteres = Critere.objects.all().values('id', 'name', 'chapitre_norme', 'chapitre_norme__name')
        return JsonResponse({'status': 'success', 'data': list(criteres)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign key exists
            try:
                ChapitreNorme.objects.get(id=data['chapitre_norme'])
            except ChapitreNorme.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'ChapitreNorme with id {data["chapitre_norme"]} does not exist'}, status=400)
            
            critere = Critere.objects.create(
                name=data['name'],
                chapitre_norme_id=data['chapitre_norme']
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': critere.id,
                    'name': critere.name,
                    'chapitre_norme': critere.chapitre_norme.id,
                    'chapitre_norme_name': critere.chapitre_norme.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypeCotationListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        type_cotations = TypeCotation.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(type_cotations)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            type_cotation = TypeCotation.objects.create(name=data['name'])
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_cotation.id,
                    'name': type_cotation.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class SousCritereListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        sous_criteres = SousCritere.objects.all().values(
            'id', 'content', 'reaction', 'critere', 'critere__name', 
            'type_cotation', 'type_cotation__name'
        )
        return JsonResponse({'status': 'success', 'data': list(sous_criteres)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign key exists
            try:
                Critere.objects.get(id=data['critere'])
            except Critere.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'Critere with id {data["critere"]} does not exist'}, status=400)
            
            # Optional: validate type_cotation if provided
            if 'type_cotation' in data:
                try:
                    TypeCotation.objects.get(id=data['type_cotation'])
                except TypeCotation.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': f'TypeCotation with id {data["type_cotation"]} does not exist'}, status=400)
            
            sous_critere = SousCritere.objects.create(
                content=data['content'],
                critere_id=data['critere'],
                reaction=data.get('reaction', ''),
                type_cotation_id=data.get('type_cotation')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': sous_critere.id,
                    'content': sous_critere.content,
                    'reaction': sous_critere.reaction,
                    'critere': sous_critere.critere.id,
                    'critere_name': sous_critere.critere.name,
                    'type_cotation': sous_critere.type_cotation.id if sous_critere.type_cotation else None,
                    'type_cotation_name': sous_critere.type_cotation.name if sous_critere.type_cotation else None
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class FormulaireAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        formulaires = FormulaireAudit.objects.all().values(
            'id', 'name', 'processus', 'processus__name', 
            'type_audit', 'type_audit__name'
        )
        return JsonResponse({'status': 'success', 'data': list(formulaires)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys if provided
            if 'processus' in data:
                try:
                    from .models import Processus
                    Processus.objects.get(id=data['processus'])
                except Processus.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': f'Processus with id {data["processus"]} does not exist'}, status=400)
            
            if 'type_audit' in data:
                try:
                    TypeAudit.objects.get(id=data['type_audit'])
                except TypeAudit.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': f'TypeAudit with id {data["type_audit"]} does not exist'}, status=400)
            
            formulaire = FormulaireAudit.objects.create(
                name=data['name'],
                processus_id=data.get('processus'),
                type_audit_id=data.get('type_audit')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': formulaire.id,
                    'name': formulaire.name,
                    'processus': formulaire.processus.id if formulaire.processus else None,
                    'processus_name': formulaire.processus.name if formulaire.processus else None,
                    'type_audit': formulaire.type_audit.id if formulaire.type_audit else None,
                    'type_audit_name': formulaire.type_audit.name if formulaire.type_audit else None
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class ListeAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        liste_audits = ListeAudit.objects.all().values('id', 'desc', 'status', 'number_audit')
        return JsonResponse({'status': 'success', 'data': list(liste_audits)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            liste_audit = ListeAudit.objects.create(
                desc=data['desc'],
                status=data.get('status', False),
                number_audit=data.get('number_audit', 0)
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': liste_audit.id,
                    'desc': liste_audit.desc,
                    'status': liste_audit.status,
                    'number_audit': liste_audit.number_audit
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class ResultatAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        resultats = ResultatAudit.objects.all().values(
            'id', 'ref_audit', 'audit', 'audit__desc', 'users', 'date_audit', 
            'score_audit', 'sujet', 'site', 'auditeur', 'reference_gamme', 'processus'
        )
        return JsonResponse({'status': 'success', 'data': list(resultats)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys exist
            try:
                ListeAudit.objects.get(id=data['audit'])
            except ListeAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'ListeAudit with id {data["audit"]} does not exist'}, status=400)
            
            try:
                from Organisation.models import Site
                if 'site' in data:
                    Site.objects.get(id=data['site'])
            except Site.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'Site with id {data["site"]} does not exist'}, status=400)
            
            try:
                from django.contrib.auth.models import User
                User.objects.get(id=data['auditeur'])
            except User.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'User with id {data["auditeur"]} does not exist'}, status=400)
            
            resultat = ResultatAudit.objects.create(
                ref_audit=data['ref_audit'],
                audit_id=data['audit'],
                users=data['users'],
                sujet=data['sujet'],
                site_id=data.get('site'),
                auditeur_id=data['auditeur'],
                reference_gamme=data.get('reference_gamme', ''),
                processus=data.get('processus', '')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': resultat.id,
                    'ref_audit': resultat.ref_audit,
                    'audit': resultat.audit.id,
                    'audit_desc': resultat.audit.desc,
                    'users': resultat.users,
                    'date_audit': resultat.date_audit,
                    'score_audit': resultat.score_audit,
                    'sujet': resultat.sujet,
                    'site': resultat.site.id if resultat.site else None,
                    'auditeur': resultat.auditeur.id,
                    'reference_gamme': resultat.reference_gamme,
                    'processus': resultat.processus
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TypePreuveListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        type_preuves = TypePreuve.objects.all().values('id', 'name')
        return JsonResponse({'status': 'success', 'data': list(type_preuves)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            type_preuve = TypePreuve.objects.create(
                name=data['name']
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': type_preuve.id,
                    'name': type_preuve.name
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class PreuveAttenduListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        preuve_attendus = PreuveAttendu.objects.all().values(
            'id', 'name', 'type_preuve', 'type_preuve__name'
        )
        return JsonResponse({'status': 'success', 'data': list(preuve_attendus)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign key if provided
            if 'type_preuve' in data:
                try:
                    TypePreuve.objects.get(id=data['type_preuve'])
                except TypePreuve.DoesNotExist:
                    return JsonResponse({'status': 'error', 'message': f'TypePreuve with id {data["type_preuve"]} does not exist'}, status=400)
            
            preuve_attendu = PreuveAttendu.objects.create(
                name=data['name'],
                type_preuve_id=data.get('type_preuve')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': preuve_attendu.id,
                    'name': preuve_attendu.name,
                    'type_preuve': preuve_attendu.type_preuve.id if preuve_attendu.type_preuve else None,
                    'type_preuve_name': preuve_attendu.type_preuve.name if preuve_attendu.type_preuve else None
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class SousCritereTypeAuditListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        sous_critere_type_audits = SousCritereTypeAudit.objects.all().values(
            'id', 'sous_critere', 'sous_critere__content', 
            'type_audit', 'type_audit__name', 'status'
        )
        return JsonResponse({'status': 'success', 'data': list(sous_critere_type_audits)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys
            try:
                SousCritere.objects.get(id=data['sous_critere'])
            except SousCritere.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'SousCritere with id {data["sous_critere"]} does not exist'}, status=400)
            
            try:
                TypeAudit.objects.get(id=data['type_audit'])
            except TypeAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'TypeAudit with id {data["type_audit"]} does not exist'}, status=400)
            
            sous_critere_type_audit = SousCritereTypeAudit.objects.create(
                sous_critere_id=data['sous_critere'],
                type_audit_id=data['type_audit'],
                status=data.get('status', 'optionnel')
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': sous_critere_type_audit.id,
                    'sous_critere': sous_critere_type_audit.sous_critere.id,
                    'sous_critere_content': sous_critere_type_audit.sous_critere.content,
                    'type_audit': sous_critere_type_audit.type_audit.id,
                    'type_audit_name': sous_critere_type_audit.type_audit.name,
                    'status': sous_critere_type_audit.status
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class FormulaireSousCritereListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        formulaire_sous_criteres = FormulaireSousCritere.objects.all().values(
            'id', 'formulaire', 'formulaire__name', 
            'sous_critere', 'sous_critere__content', 'ordre'
        )
        return JsonResponse({'status': 'success', 'data': list(formulaire_sous_criteres)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            
            # Validate foreign keys
            try:
                FormulaireAudit.objects.get(id=data['formulaire'])
            except FormulaireAudit.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'FormulaireAudit with id {data["formulaire"]} does not exist'}, status=400)
            
            try:
                SousCritere.objects.get(id=data['sous_critere'])
            except SousCritere.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'SousCritere with id {data["sous_critere"]} does not exist'}, status=400)
            
            formulaire_sous_critere = FormulaireSousCritere.objects.create(
                formulaire_id=data['formulaire'],
                sous_critere_id=data['sous_critere'],
                ordre=data.get('ordre', 0)
            )
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': formulaire_sous_critere.id,
                    'formulaire': formulaire_sous_critere.formulaire.id,
                    'formulaire_name': formulaire_sous_critere.formulaire.name,
                    'sous_critere': formulaire_sous_critere.sous_critere.id,
                    'sous_critere_content': formulaire_sous_critere.sous_critere.content,
                    'ordre': formulaire_sous_critere.ordre
                }
            })
        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class TextRefListAPIView(View):
    def get(self, request):
        # Temporarily removed authentication for testing
        text_refs = TextRef.objects.all().values('id', 'norme')
        return JsonResponse({'status': 'success', 'data': list(text_refs)})
    
    def post(self, request):
        # Temporarily removed authentication for testing
        try:
            data = json.loads(request.body)
            print("Received data:", data)  # Debug line
            
            if 'norme' not in data:
                return JsonResponse({'status': 'error', 'message': 'Missing norme field'}, status=400)
            
            if not data['norme'].strip():
                return JsonResponse({'status': 'error', 'message': 'norme cannot be empty'}, status=400)
            
            text_ref = TextRef.objects.create(norme=data['norme'])
            return JsonResponse({
                'status': 'success',
                'data': {
                    'id': text_ref.id,
                    'norme': text_ref.norme
                }
            })
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)
        except KeyError as e:
            return JsonResponse({'status': 'error', 'message': f'Missing field: {str(e)}'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Server error: {str(e)}'}, status=500)
